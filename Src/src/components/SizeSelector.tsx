import {
  Dropdown,
  Field,
  Option
} from '@fluentui/react-components';
import { sizeOptions } from '../config/models';
import type { ImageSize } from '../../shared/types';

interface SizeSelectorProps {
  value: ImageSize;
  onChange: (value: ImageSize) => void;
  disabled?: boolean;
}

export function SizeSelector({ value, onChange, disabled }: SizeSelectorProps) {
  const selected = sizeOptions.find((option) => option.id === value);
  return (
    <Field label="Image size">
      <Dropdown
        value={selected?.label ?? value}
        selectedOptions={[value]}
        disabled={disabled}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            onChange(data.optionValue as ImageSize);
          }
        }}
      >
        {sizeOptions.map((option) => (
          <Option key={option.id} value={option.id} text={option.label}>
            {option.label}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}
