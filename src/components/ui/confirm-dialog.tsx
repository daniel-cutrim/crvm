import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  resolve: ((value: boolean) => void) | null;
  variant: "default" | "destructive";
}

const defaultState: ConfirmState = {
  open: false,
  title: "",
  description: "",
  resolve: null,
  variant: "default",
};

type Listener = (state: ConfirmState) => void;
let listener: Listener | null = null;

export function confirmDialog({
  title = "Confirmar ação",
  description,
  variant = "destructive",
}: {
  title?: string;
  description: string;
  variant?: "default" | "destructive";
}): Promise<boolean> {
  return new Promise((resolve) => {
    listener?.({
      open: true,
      title,
      description,
      variant,
      resolve,
    });
  });
}

export function ConfirmDialogProvider() {
  const [state, setState] = React.useState<ConfirmState>(defaultState);

  React.useEffect(() => {
    listener = setState;
    return () => { listener = null; };
  }, []);

  const close = (result: boolean) => {
    state.resolve?.(result);
    setState(defaultState);
  };

  return (
    <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) close(false); }}>
      <AlertDialogContent className="rounded-2xl border-border/50 shadow-2xl max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-semibold">{state.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-lg" onClick={() => close(false)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className={`rounded-lg ${state.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
            onClick={() => close(true)}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
