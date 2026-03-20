/**
 * Mock Store (Legacy)
 *
 * Kept as a stub so old imports don't break the build.
 * The app now uses the FastAPI server for data storage.
 */

export function addScript(_s: any) {}
export function addJob(_j: any) {}
export function updateJob(_id: string, _u: any) {}
export function addReport(_r: any) {}
export function getJob(_id: string): any { return null; }
export function getReport(_id: string): any { return null; }
export function getReportByJobId(_id: string): any { return null; }
export function getReportByScriptId(_id: string): any { return null; }
export function getDashboardItems(): any[] { return []; }
