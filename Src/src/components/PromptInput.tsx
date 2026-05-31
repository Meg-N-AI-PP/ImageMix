import { Field, Textarea } from '@fluentui/react-components';

interface PromptInputProps {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function PromptInput({
  label,
  value,
  placeholder,
  rows = 4,
  disabled,
  onChange
}: PromptInputProps) {
  return (
    <Field label={label}>
      <Textarea
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        resize="vertical"
        textarea={{ rows }}
        onChange={(_, data) => onChange(data.value)}
      />
    </Field>
  );
}
