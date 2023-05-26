import { MongoClient, ServerApiVersion } from "mongodb";

class DbMongo {
  mongo = new MongoClient(
    process.env["MONGO_URI"] || "mongodb://localhost:27017",
    {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    },
  );

  db = {
    user: this.mongo.db("user"),
    data: this.mongo.db("data"),
    zh: this.mongo.db("zh"),
  };

  col = {
    user: {
      user: this.db.user.collection<{
        _id: string; // WaniKani user ID
        username: string;
        level: string;
        settings: {
          vocabPerHanzi: number;
          ignoreWanikaniLevel: boolean;
        };
      }>("user"),
      item: this.db.user.collection<{
        user: string;
        itemId: string;
        type: string;
        item: string[];
        reading: string[];
        meaning: string[];
        quiz: {
          srs: number;
          nextReview: Date;
        } | null;
      }>("item"),
      sentenceLog: this.db.user.collection<{
        _id: string; // searching q
        updated: Date;
        count: number;
      }>("sentenceLog"),
      sentence: this.db.user.collection<{
        user?: string;
        author_japanese: string; // !empty string
        /** @type {'anime' | 'drama' | 'games' | 'literature'} */
        category: "anime" | "drama" | "games" | "literature";
        channel: string; // !empty string
        deck_name: string; // *series title
        deck_name_japanese: string; // !empty string, even for Romaji titles
        episode: string; // !empty string
        id: number;
        image_url: string;
        sentence: string;
        sentence_id: string;
        sentence_with_furigana: string; // *Anki style Furigana
        sound_begin: string; // !empty string
        sound_end: string; // !empty string
        sound_url: string;
        /** @type {'Comedy' | 'Manga' | 'School Life' | 'Fantasy' | 'Romance' | 'Action' | 'Super Power' | 'Drama' | 'SciFi' | 'Ecchi' | 'Daily Life' | 'High School' | 'TYPE-MOON' | 'Dystopian' | 'Female Protagonist' | 'School' | 'Adventure' | 'Supernatural' | 'Parody' | 'Netflix' | 'Slice Of Life' | 'Magic' | 'Slice of Life' | 'Game' | 'Novel' | 'Parallel World' | 'Science Fiction' | 'Dystopia' | 'Cyberpunk' | 'Isekai' | 'Slife of Life' | 'Time Travel' | 'Visual Novel' | 'A-1 Pictures' | 'Light Novel' | 'Hulu'} */
        tags: string[];
        timestamp: string; // !empty string
        translation: string;
        translation_word_index: number[];
        translation_word_list: string[];
        word_index: number[];
        word_list: string[];
      }>("sentence"),
    },
    data: {
      meta: this.db.data.collection<{
        _id: string;
        updated: Date;
      }>("meta"),
      character: this.db.data.collection<{
        sub: string[];
        sup: string[];
        var: string[];
        entry: string;
      }>("character"),
      sentence: this.db.data.collection<{
        tatoebaId: number;
        lang: "cmn" | "jpn" | "eng";
        translationIds: number[];
        text: string;
        fulltext?: string;
        vocabularies?: string[];
        tags: string[];
      }>("sentence"),
    },
    zh: {
      meta: this.db.zh.collection<{
        _id: string;
        updated: Date;
      }>("meta"),
      cedict: this.db.zh.collection<{
        key: string;
        traditional?: string;
        simplified: string;
        pinyin: string;
        gloss: string;
      }>("cedict"),
    },
  };

  func = {
    zh: {
      cedict: {
        makeKey: (o: {
          traditional?: string;
          simplified: string;
          pinyin: string;
        }) => {
          return `${o.pinyin} ${o.simplified} ${o.traditional || ""}`;
        },
      },
    },
  };
  isConnected = false;

  async connect(): Promise<this> {
    if (this.isConnected) return this;

    await this.mongo.connect();
    this.isConnected = true;

    await Promise.allSettled([
      ...((col) => {
        return [col.createIndex({ username: 1 }, { unique: true })];
      })(this.col.user.user),
      ...((col) => {
        return [
          col.createIndex({ user: 1, itemId: 1 }, { unique: true }),
          col.createIndex({ item: 1 }),
          col.createIndex({ reading: 1 }),
          col.createIndex({ meaning: 1 }),
          col.createIndex({ "quiz.srs": 1 }),
          col.createIndex({ "quiz.nextReview": 1 }),
        ];
      })(this.col.user.item),
      ...((col) => {
        return [col.createIndex({ updated: 1 })];
      })(this.col.user.sentenceLog),
      ...((col) => {
        return [
          col.createIndex({ user: 1, id: 1 }, { unique: true }),
          col.createIndex({ updated: 1 }),
          col.createIndex({ category: 1 }),
          col.createIndex({ deck_name: 1 }),
          col.createIndex({ sentence_with_furigana: 1 }),
          col.createIndex({ tags: 1 }),
          col.createIndex({ translation: "text" }),
          col.createIndex({ word_list: 1 }),
        ];
      })(this.col.user.sentence),
      ...((col) => {
        return [col.createIndex({ updated: 1 })];
      })(this.col.data.meta),
      ...((col) => {
        return [
          col.createIndex({ sub: 1 }),
          col.createIndex({ sup: 1 }),
          col.createIndex({ var: 1 }),
          col.createIndex({ entry: 1 }, { unique: true }),
        ];
      })(this.col.data.character),
      ...((col) => {
        return [
          col.createIndex({ tatoebaId: 1 }, { unique: true }),
          col.createIndex({ lang: 1 }),
          col.createIndex({ translationIds: 1 }),
          col.createIndex({ fulltext: "text" }),
          col.createIndex({ vocabularies: 1 }),
          col.createIndex({ tags: 1 }),
        ];
      })(this.col.data.sentence),
      ...((col) => {
        return [col.createIndex({ updated: 1 })];
      })(this.col.zh.meta),
      ...((col) => {
        return [
          col.createIndex({ key: 1 }),
          col.createIndex({ traditional: 1 }),
          col.createIndex({ simplified: 1 }),
          col.createIndex(
            { pinyin: 1 },
            {
              collation: { locale: "simple", strength: 1 },
            },
          ),
          col.createIndex({ gloss: "text" }),
        ];
      })(this.col.zh.cedict),
    ]);

    return this;
  }

  async disconnect() {
    return this.mongo.close();
  }

  async runAndClose(fn: (db: this) => Promise<void>) {
    await this.connect();
    await fn(this);
    await this.disconnect();
  }
}

export const db = new DbMongo();
