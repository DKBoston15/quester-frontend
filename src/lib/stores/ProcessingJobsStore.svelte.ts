interface ProcessingJob {
  id: string;
  files?: Array<{ filename: string; size: number }>;
  isUploading?: boolean;
  targetLiteratureId?: string;
}

let jobs = $state<ProcessingJob[]>([]);

export const processingJobsStore = {
  get all() {
    return jobs.map(j => j.id);
  },
  get jobs() {
    return jobs;
  },
  add(jobId: string, files?: Array<{ filename: string; size: number }>, targetLiteratureId?: string) {
    if (!jobId) return;
    const existingJob = jobs.find(j => j.id === jobId);
    if (!existingJob) {
      jobs = [{ id: jobId, files, isUploading: !!files, targetLiteratureId }, ...jobs];
    }
  },
  getJob(jobId: string) {
    return jobs.find(j => j.id === jobId);
  },
  setUploaded(jobId: string) {
    jobs = jobs.map(j => j.id === jobId ? { ...j, isUploading: false } : j);
  },
  remove(jobId: string) {
    jobs = jobs.filter((j) => j.id !== jobId);
  },
  clear() {
    jobs = [];
  },
};
