/**
 * ThreadedTaskView interface (port of com.eteks.sweethome3d.viewcontroller.ThreadedTaskView, GPL v2+).
 * A view that displays a long-running task.
 */
import type { View } from "./View.js";

export interface ThreadedTaskView extends View {
  /** Executes the runnable later on the UI thread. */
  invokeLater(runnable: () => void): void;
  /** Shows/hides the task progress message. */
  setTaskRunning(taskRunning: boolean, message?: string): void;
  /** Returns true if the task was canceled. */
  isTaskCanceled(): boolean;
  /** Returns the exception that stopped the task, or null. */
  getTaskException(): unknown | null;
}
