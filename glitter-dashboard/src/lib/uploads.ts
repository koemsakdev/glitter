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
    const { data } = await apiClient.post<UploadResult>(
        `/api/uploads/image${minWidth ? `?minWidth=${minWidth}` : ''}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
}
