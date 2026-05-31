import {
  Dropdown,
  Field,
  Option,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import type { ModelOption } from '../config/models';

const useStyles = makeStyles({
  root: {
    minWidth: '220px',
    marginBottom: tokens.spacingVerticalS
  }
});

interface ModelSelectorProps {
  label: string;
  options: ModelOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  label,
  options,
  value,
  onChange,
  disabled
}: ModelSelectorProps) {
  const styles = useStyles();
  const selected = options.find((option) => option.id === value);

  return (
    <Field label={label} className={styles.root}>
      <Dropdown
        value={selected?.label ?? value}
        selectedOptions={[value]}
        disabled={disabled}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            onChange(data.optionValue);
          }
        }}
      >
        {options.map((option) => (
          <Option key={option.id} value={option.id} text={option.label}>
            {option.label}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}
