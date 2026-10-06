/**
 * The one hook `BlockRendererComponent` exposes for editor interaction
 * (Phase 2C, docs/25_VISUAL_EDITOR_ARCHITECTURE.md "Canvas"). Passing an
 * `editorHost` makes the renderer wrap each top-level block in a thin,
 * classed container with click/hover bindings; passing none (the public
 * site, always) renders exactly the bare block output with zero extra DOM
 * — "editor overlay ≠ public content" is enforced by this being optional,
 * not by a second renderer.
 */
export interface BlockEditorHost {
  selectedId(): string | null;
  hoveredId(): string | null;
  select(id: string): void;
  hover(id: string | null): void;
  /** Contextual actions (task §7: "Edit / Duplicate / Move / Delete") —
   * optional so a host can offer a read-only selection experience without
   * mutation controls if it ever needs to. */
  duplicate?(id: string): void;
  remove?(id: string): void;
  moveUp?(id: string): void;
  moveDown?(id: string): void;
  /** Inline text editing: canvas text fields are directly click-and-type
   * editable (via `ui-inline-text`) rather than requiring the side panel.
   * Optional so a read-only host can omit mutation entirely. */
  updateProp?(id: string, key: string, value: unknown): void;
}
