"use client";

import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export default function ErrorDialog({ open, onClose, title = "Error", message }: ErrorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogPopup>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{message}</AlertDialogDescription>
        <div className="flex justify-end pt-2">
          <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
        </div>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
