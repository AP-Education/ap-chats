import { defineApp } from '@ap/shell-sdk';
import { Fragment } from 'react';

import { DemoContent } from './DemoContent';
import { DemoPanel } from './DemoPanel';

export default defineApp({ Providers: Fragment, Panel: DemoPanel, Content: DemoContent });
