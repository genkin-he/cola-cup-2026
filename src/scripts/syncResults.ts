import { runSyncResults } from "../lib/jobs/syncResults";

runSyncResults()
  .then((r) => {
    console.log(
      `Synced results: settled ${r.settled}, skipped ${r.skipped}, unmatched ${r.unmatched}.`,
    );
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
