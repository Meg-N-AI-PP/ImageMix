import { useState } from 'react';
import {
  Tab,
  TabList,
  Text,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import {
  Beaker24Regular,
  Image24Regular,
  ImageMultiple24Regular,
  Settings24Regular,
  Sparkle24Regular,
  TextField24Regular
} from '@fluentui/react-icons';
import { GenerateView } from '../features/generate/GenerateView';
import { FusionView } from '../features/fusion/FusionView';
import { PromptMixerView } from '../features/promptMixer/PromptMixerView';
import { LibraryView } from '../features/library/LibraryView';
import { SettingsView } from '../features/settings/SettingsView';

type TabKey = 'generate' | 'fusion' | 'mixer' | 'library' | 'settings';

const useStyles = makeStyles({
  shell: {
    display: 'grid',
    gridTemplateColumns: '232px 1fr',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground2
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase500
  },
  tabs: {
    display: 'flex',
    flexDirection: 'column'
  },
  content: {
    padding: tokens.spacingVerticalXL,
    overflow: 'hidden'
  },
  footer: {
    marginTop: 'auto',
    color: tokens.colorNeutralForeground3
  }
});

export function AppShell() {
  const styles = useStyles();
  const [tab, setTab] = useState<TabKey>('generate');

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Sparkle24Regular />
          ImageMix
        </div>
        <TabList
          className={styles.tabs}
          vertical
          selectedValue={tab}
          onTabSelect={(_, data) => setTab(data.value as TabKey)}
        >
          <Tab value="generate" icon={<Image24Regular />}>
            Generate
          </Tab>
          <Tab value="fusion" icon={<Beaker24Regular />}>
            Fusion
          </Tab>
          <Tab value="mixer" icon={<TextField24Regular />}>
            Prompt Mixer
          </Tab>
          <Tab value="library" icon={<ImageMultiple24Regular />}>
            Library
          </Tab>
          <Tab value="settings" icon={<Settings24Regular />}>
            Settings
          </Tab>
        </TabList>
        <Text className={styles.footer} size={200}>
          Combine text and images with OpenAI models.
        </Text>
      </aside>

      <main className={styles.content}>
        {tab === 'generate' ? (
          <GenerateView onUsedAsSource={() => setTab('fusion')} />
        ) : null}
        {tab === 'fusion' ? <FusionView /> : null}
        {tab === 'mixer' ? <PromptMixerView /> : null}
        {tab === 'library' ? (
          <LibraryView onUsedAsSource={() => setTab('fusion')} />
        ) : null}
        {tab === 'settings' ? <SettingsView /> : null}
      </main>
    </div>
  );
}
