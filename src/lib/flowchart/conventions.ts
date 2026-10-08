/**
 * Flowchart conventions per SGK Tin học 6 – Kết nối tri thức.
 * Adjust these if the textbook uses different shapes.
 */

/** Shape types for flowchart nodes */
export const SHAPES = {
  terminator: "oval / viên thuốc, dùng cho Bắt đầu và Kết thúc",
  process: "hình chữ nhật, dùng cho mọi bước thực hiện (kể cả nhập, tính toán, hiển thị)",
  decision: "hình thoi, dùng cho điều kiện (câu hỏi đúng/sai)",
} as const;

/** Labels for decision edges – configurable per SGK */
export const DECISION_LABELS = { yes: "Đúng", no: "Sai" } as const;

/**
 * Shape used for I/O operations.
 * Change to "parallelogram" if the SGK uses a parallelogram for input/output.
 */
export const IO_SHAPE = "process" as const;

export type ShapeType = keyof typeof SHAPES;
