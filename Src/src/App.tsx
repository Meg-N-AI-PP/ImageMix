import {
  FluentProvider,
  webDarkTheme
} from '@fluentui/react-components';
import { AppShell } from './components/AppShell';
import { LibraryProvider } from './hooks/useImageLibrary';
import { SelectionProvider } from './hooks/useSelection';

export default function App() {
  return (
    <FluentProvider theme={webDarkTheme}>
      <LibraryProvider>
        <SelectionProvider>
          <AppShell />
        </SelectionProvider>
      </LibraryProvider>
    </FluentProvider>
  );
}
