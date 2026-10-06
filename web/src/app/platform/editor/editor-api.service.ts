import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Page } from '../core/api.types';
import { ContentBlockTypeDef, ContentItemSummary, ContentVersionRecord } from './editor.types';
import { BlockNode } from '../../shared/blocks/block.types';

/**
 * The only place the editor talks to the CMS API. Thin wrapper over
 * `ApiService` (same `/api/v1` base, same session/CSRF handling) — no
 * separate HTTP stack. Every call goes through the same authorized,
 * server-enforced endpoints the rest of Phase 2A/2B already built; nothing
 * here decides authorization, it only shapes requests/responses.
 */
@Injectable()
export class EditorApiService {
  private api = inject(ApiService);

  /** Resolves the editor route's (contentType, slug) to a ContentItem —
   * scope-checked server-side (404 outside scope, never a leak). */
  getItemBySlug = (contentType: string, slug: string) =>
    this.api.get<ContentItemSummary>(`/content/by-slug/${contentType}/${slug}`);

  /** Every ContentItem visible to the caller (`_visible_items`, same scoping
   * as everywhere else in this API) — backs the "Pages" directory. */
  listItems = (page = 1) => this.api.get<Page<ContentItemSummary>>('/content', { page });

  /** Creates a brand-new ContentItem + its first DRAFT version
   * (`ContentItemListView.post`) — server enforces `content.submit` at the
   * chosen scope and the (content_type, slug) uniqueness constraint
   * (409 `stale_version`-style conflict if the slug is taken). Starts with
   * an empty block document; the editor fills it in afterwards. */
  createItem = (body: {
    content_type: string;
    slug: string;
    owner_vertical_id?: string | null;
  }) =>
    this.api.post<ContentItemSummary>('/content', {
      ...body,
      blocks: { schema_version: 1, blocks: [] },
    });

  getVersion = (versionId: string) =>
    this.api.get<ContentVersionRecord>(`/content/versions/${versionId}`);

  /** Starts a new draft from an existing (usually published) version —
   * used when the item has no draft_version yet. */
  newDraftFrom = (
    versionId: string,
    blocks: { schema_version: number; blocks: BlockNode[] },
    seo: unknown,
  ) =>
    this.api.post<ContentVersionRecord>(`/content/versions/${versionId}/new-draft`, {
      blocks,
      seo,
    });

  /** Optimistic-concurrency save: `expectedUpdatedAt` must match the
   * server's current `updated_at` for this version or the request is
   * rejected with `{error: {code: "stale_version"}}` (409), never a
   * silent overwrite. */
  saveDraft = (
    versionId: string,
    blocks: { schema_version: number; blocks: BlockNode[] },
    seo: unknown,
    expectedUpdatedAt: string,
  ) =>
    this.api.patch<ContentVersionRecord>(`/content/versions/${versionId}`, {
      blocks,
      seo,
      expected_updated_at: expectedUpdatedAt,
    });

  /** Submits a DRAFT for review (task §2 "submit a draft for approval") — the
   * server enforces the DRAFT->SUBMITTED transition and snapshots the
   * required approval stages (`apps.content.workflow.submit`). */
  submit = (versionId: string) =>
    this.api.post<ContentVersionRecord>(`/content/versions/${versionId}/submit`);

  getBlockTypes = () => this.api.get<{ results: ContentBlockTypeDef[] }>('/content/block-types');

  getMediaUploadParams = (ownerVerticalId: string | null) =>
    this.api.get<{
      cloud_name: string;
      api_key: string;
      timestamp: number;
      signature: string;
      folder: string;
      endpoint: string;
    }>(
      '/content/media/upload-params',
      ownerVerticalId ? { owner_vertical_id: ownerVerticalId } : {},
    );

  listMedia = (page = 1) =>
    this.api.get<{ results: MediaAssetRecord[]; count: number }>('/content/media', { page });

  recordMediaAsset = (body: {
    cloudinary_public_id: string;
    delivery_url: string;
    width?: number;
    height?: number;
    mime_type?: string;
    file_size?: number;
    alt_text?: string;
    caption?: string;
    owner_vertical_id?: string | null;
  }) => this.api.post<MediaAssetRecord>('/content/media', body);
}

export interface MediaAssetRecord {
  id: string;
  cloudinary_public_id: string;
  delivery_url: string;
  width: number | null;
  height: number | null;
  mime_type: string;
  file_size: number | null;
  alt_text: string;
  caption: string;
  uploaded_by_email: string;
  owner_vertical: string | null;
  usage_count: number;
  created_at: string;
}
