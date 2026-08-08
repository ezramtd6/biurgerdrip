import { forwardRef, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ className, label, labelClassName, error, id, ...props }, ref) => {
    return (
      <div className="grid gap-1.5">
        {label && (
          <Label htmlFor={id} className={cn(labelClassName)}>
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          className={className}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

FormField.displayName = "FormField";
export default FormField;
