import { db } from "../db";

export default defineCachedEventHandler(
  async (
    ev,
  ): Promise<{
    data: [{ examples: any[] }];
  }> => {
    const { q } = getQuery(ev);
    if (!q || typeof q !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "no valid q supplied",
      });
    }

    await db.connect();

    const rLog = await db.col.user.sentenceLog.findOne({ _id: q });
    if (rLog) {
      if (!rLog.count) return { data: [{ examples: [] }] };

      // return {
      //   data: [
      //     {
      //       examples: await db.col.user.sentence
      //         .find({ word_list: q })
      //         .toArray(),
      //     },
      //   ],
      // };
    }

    const r = await $fetch<{
      data: [{ examples: any[] }];
    }>("https://api.immersionkit.com/look_up_dictionary", {
      query: {
        keyword: q,
      },
    });

    const now = new Date();

    const examples = r.data[0].examples;

    db.col.user.sentenceLog.findOneAndReplace(
      { _id: q },
      { updated: now, count: examples.length },
      { upsert: true },
    );

    if (examples.length) {
      db.col.user.sentence.bulkWrite(
        examples.map((ex) => ({
          replaceOne: {
            filter: { id: ex.id },
            replacement: {
              ...ex,
              updated: now,
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    return r;
  },
);
