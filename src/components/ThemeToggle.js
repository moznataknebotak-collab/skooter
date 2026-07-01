import { useTheme, useStyles } from './ui';

export default function ThemeToggle() {
  const { dark, toggle } = useTheme();
  const s = useStyles();
  return (
    <button onClick={toggle} title={dark ? 'Světlý režim' : 'Tmavý režim'}
      style={{ ...s.btnSecondary, fontSize: 13, padding: '6px 9px' }}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
