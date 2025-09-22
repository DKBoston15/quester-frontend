import type { DesignDetail } from '$lib/utils/design'

export interface Literature {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  title: string;
  type: string;
  authors: any[] | string;
  editors: any[] | string;
  keywords: any[] | string;
  chapterTitle: string;
  endPage: string;
  issue: string;
  link: string;
  publishYear: string;
  publisherName: string;
  startPage: string;
  status: string;
  volume: string;
  researchDesign: DesignDetail;
  analyticDesign: DesignDetail;
  samplingDesign: DesignDetail;
  measurementDesign: DesignDetail;
  secondName: string;
  city: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  doi?: string;
}
