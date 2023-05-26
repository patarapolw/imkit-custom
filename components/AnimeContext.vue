<template>
  <section id="anime-sentences-parent">
    <form @submit.prevent="onSubmit">
      <input
        lang="ja"
        type="search"
        autocomplete="off"
        autocapitalize="none"
        autocorrect="off"
        id="user-response"
        name="anime-context-filter"
        placeholder="Filter"
        v-model.trim="q"
        @input="filterExamples"
      />
    </form>

    <div v-if="immersionKitData.length" @scroll="onScroll">
      <div
        class="anime-example"
        v-for="ex in examples.slice(0, endIndex)"
        :key="ex.id"
      >
        <img v-if="ex.image_url" :src="ex.image_url" :alt="ex.sentence_id" />
        <div class="anime-example-text">
          <h4 class="title" :title="ex.sentence_id">
            {{ ex.deck_name }}
          </h4>
          <div class="ja" lang="ja">
            <span>
              {{ ex.sentence }}
            </span>
          </div>
          <audio
            class="audio"
            :src="ex.sound_url"
            preload="none"
            controls
          ></audio>
          <div class="en">
            <span v-html="ex.translation"></span>
          </div>
        </div>
      </div>
    </div>

    <div v-else style="padding-top: 1em">
      {{ currentQuery ? "No sentences found." : "" }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from "vue-demi";
import { toHiragana } from "~/utils/ja";

const BATCH_SIZE = 10;

const endIndex = ref(BATCH_SIZE);
const currentQuery = ref("");
const q = ref("");
const immersionKitData = ref<ImmersionKitExample[]>([]);
const examples = ref<ImmersionKitExample[]>([]);

function filterExamples() {
  endIndex.value = BATCH_SIZE;

  const remaining: ImmersionKitExample[] = [];

  if (q) {
    q.value
      .toLocaleLowerCase()
      .split(/([\p{sc=Han}\p{sc=Katakana}\p{sc=Hiragana}ー]+)/gu)
      .map((s, i) => {
        s = s.trim();
        if (!s) return;

        if (i % 2) {
          s = toHiragana(s);
          const re = new RegExp(
            `${s.replace(/\p{sc=Hiragana}+/gu, (t) => {
              return `(${Array.from(t)
                .map((_, i) => t.substring(0, i + 1))
                .join("|")})?`;
            })}`,
          );
          const exExact: ImmersionKitExample[] = [];
          const exRe: ImmersionKitExample[] = [];

          examples.value.map((ex) => {
            for (let t of [ex.sentence, ex.sentence_with_furigana]) {
              t = toHiragana(t);
              if (t.includes(s)) {
                return exExact.push(ex);
              }
              if (re.test(t)) {
                return exRe.push(ex);
              }
            }
            remaining.push(ex);
          });
          examples.value = [...exExact, ...exRe];
        } else {
          examples.value = examples.value.filter((ex) => {
            if (
              [ex.deck_name, ex.category, ...ex.tags, ex.translation].some(
                (t) => t.toLocaleLowerCase().includes(s),
              )
            ) {
              return true;
            }
            remaining.push(ex);
          });
        }
      });
  } else {
    remaining.push(...examples.value);
    examples.value = [];
  }
  return remaining;
}

function onSubmit() {
  const q0 = q.value.trim();
  if (!q0) return;
  navigateTo({ query: { q: q0 } });
}

function onScroll(ev: UIEvent) {
  if (!(ev.target instanceof HTMLElement)) return;
  const { clientHeight, scrollHeight, scrollTop } = ev.target;
  if (clientHeight + scrollTop >= scrollHeight) {
    endIndex.value += BATCH_SIZE;
  }
}

const state = {
  filterFirst: [
    "Death Note",
    /Kino.* Journey/i,
    "anohana",
    "alchemist",
    "hunter",
    /Code Geass/i,
  ],
  filterOut: [] as (string | RegExp)[],
  item: null, // current vocab from wkinfo
  userLevel: "", // most recent level progression
  sentencesEl: null, // referenced so sentences can be re-rendered after settings change
};

interface ImmersionKitExample {
  category: string;
  deck_name: string;
  sentence: string;
  sentence_with_furigana: string;
  id: number;
  sentence_id: string;
  sound_url: string;
  tags: string[];
  translation: string;
  word_index: number[];
  image_url?: string;
}

const route = useRoute();
watch(() => route.query.q, doSearch);
doSearch();

async function doSearch() {
  if (typeof route.query.q === "string") {
    examples.value = [];

    const r = await useFetch<{
      data: {
        examples: ImmersionKitExample[];
      }[];
    }>(`/api/sentence`, { query: { q: route.query.q } }).then(
      (r) => r.data.value,
    );

    endIndex.value = BATCH_SIZE;
    q.value = route.query.q;
    currentQuery.value = q.value;

    immersionKitData.value = r ? r.data[0].examples : [];
    examples.value = immersionKitData.value;

    // Filter out excluded titles
    if (state.filterOut.length) {
      examples.value = examples.value.filter((s) => {
        for (const f of state.filterOut) {
          if (typeof f !== "string") {
            if (f.test(s.deck_name)) return false;
          } else {
            if (s.deck_name.toLocaleLowerCase().includes(f.toLocaleLowerCase()))
              return false;
          }
        }
        return true;
      });
    }

    // Filter selected titles first
    if (state.filterFirst.length) {
      const fn = (s: ImmersionKitExample) => {
        let i = 0;
        for (const f of state.filterFirst) {
          if (typeof f !== "string") {
            if (f.test(s.deck_name)) break;
          } else {
            if (s.deck_name.toLocaleLowerCase().includes(f.toLocaleLowerCase()))
              break;
          }
          i++;
        }

        return i;
      };
      examples.value = examples.value.sort((a, b) => fn(a) - fn(b));
    }

    const remaining = filterExamples();
    examples.value = [...examples.value, ...remaining];
  }
}
</script>

<style scoped>
#anime-sentences-parent {
  display: grid;
  grid-template-rows: auto 1fr;
  height: calc(100vh - 50px);
  font-family: sans-serif;
}

#anime-sentences-parent > div {
  overflow-y: scroll;
}

.anime-example {
  display: flex;
  align-items: center;
  margin-bottom: 1em;
  min-height: 100px;

  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.anime-example::-webkit-scrollbar {
  display: none; /* Chrome */
}

/* Make text and background color the same to hide text */
.anime-example-text .show-on-hover,
.anime-example-text .show-on-click {
  background: #ccc;
  color: #ccc;
  text-shadow: none;
}

.anime-example-text .show-on-hover:hover {
  background: inherit;
  color: inherit;
}

/* Furigana hover*/
.anime-example-text .show-ruby-on-hover ruby rt {
  visibility: hidden;
}

.anime-example-text:hover .show-ruby-on-hover ruby rt {
  visibility: visible;
}

.anime-example .title {
  font-weight: 700;
}

.anime-example .ja {
  font-size: 1.3em;
}

.anime-example img {
  margin-right: 1em;
  width: 200px;
  height: 115px;
  object-fit: contain;
}

input[type="search"] {
  width: 100%;
  font-size: 2rem;
  padding: 5px;
  border-radius: 5px;
}
</style>
