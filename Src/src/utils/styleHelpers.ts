import type { GriffelStyle } from '@fluentui/react-components';

// Griffel's makeStyles rejects the 4-side border shorthands (borderWidth,
// borderStyle, borderColor). These helpers expand them into per-side longhands.

export function borderAll(
  width: string,
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none',
  color: string
): GriffelStyle {
  return {
    borderTopWidth: width,
    borderRightWidth: width,
    borderBottomWidth: width,
    borderLeftWidth: width,
    borderTopStyle: style,
    borderRightStyle: style,
    borderBottomStyle: style,
    borderLeftStyle: style,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: color,
    borderLeftColor: color
  };
}

export function borderColorAll(color: string): GriffelStyle {
  return {
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: color,
    borderLeftColor: color
  };
}
