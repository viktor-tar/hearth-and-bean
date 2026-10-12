'use client';

import { useEffect } from 'react';
import { initHomeMotion } from './motion';

/** Starts the home page's scroll animations once the page is on screen. Renders nothing. */
export default function HomeMotion() {
  useEffect(() => initHomeMotion(), []);
  return null;
}
