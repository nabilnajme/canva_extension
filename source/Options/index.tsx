import React from 'react';
import {createRoot} from 'react-dom/client';
import 'core-js/stable';
import 'regenerator-runtime/runtime';

import Options from './Options';

const optionsRoot = document.getElementById('options-root');

if (optionsRoot) {
  createRoot(optionsRoot).render(<Options />);
}
