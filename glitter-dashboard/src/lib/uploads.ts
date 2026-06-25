import { apiClient } from '@/lib/api-client';

export interface UploadResult {
    url: string;
    width: number;
    height: number;
}

/** Upload + optimize an image; `minWidth` rejects images that are too small. */
export async function uploadImage(
    file: File,
    minWidth?: number,
): Promise<UploadResult> {
    const fd = new FormData();
    fd.append('image', file);
    // Send minWidth whenever provided — including 0, which disables the check.
    const query = minWidth !== undefined ? `?minWidth=${minWidth}` : '';
    const { data } = await apiClient.post<UploadResult>(
        `/api/uploads/image${query}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
}

export interface UploadedImage {
    url: string;
    name: string;
}

/** List previously uploaded images (most recent first) for re-use pickers. */
export async function listUploadedImages(): Promise<UploadedImage[]> {
    const { data } = await apiClient.get<{ data: UploadedImage[] }>(
        '/api/uploads/images',
    );
    return data.data;
}
