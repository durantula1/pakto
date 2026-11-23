"use client";

import { toast } from "sonner";

import type { StageReady } from "@/modules/tasks/actions";
import { updateMilestoneAction } from "@/modules/projects/operations";

/**
 * After the last task of a stage is done: ask whether the stage itself is done. Never automatic,
 * because finishing a stage can make a payment due and tells the client.
 */
export function offerStageDone(stage: StageReady | undefined) {
  if (!stage) return;
  toast(`Всички задачи по „${stage.title}“ са готови.`, {
    description: "Да отбележа ли етапа като завършен?",
    duration: 15_000,
    action: {
      label: "Етапът е завършен",
      onClick: async () => {
        const formData = new FormData();
        formData.set("projectId", stage.projectId);
        formData.set("milestoneId", stage.milestoneId);
        formData.set("status", "completed");
        const result = await updateMilestoneAction(formData);
        if (result.error) toast.error(result.error);
        else toast.success("Етапът е завършен");
      },
    },
  });
}
