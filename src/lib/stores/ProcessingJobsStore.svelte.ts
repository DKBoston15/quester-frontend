let jobs = $state<string[]>([]);

export const processingJobsStore = {
  get all() {
    return jobs;
  },
  add(jobId: string) {
    if (!jobId) return;
    if (!jobs.includes(jobId)) jobs = [jobId, ...jobs];
  },
  remove(jobId: string) {
    jobs = jobs.filter((id) => id !== jobId);
  },
  clear() {
    jobs = [];
  },
};

