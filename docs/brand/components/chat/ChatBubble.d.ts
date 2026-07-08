import React from 'react';

export interface ChatBubbleProps {
  /** Who is speaking. agent = serif voice · user = sans right-aligned · system = centred caption. */
  author?: 'agent' | 'user' | 'system';
  /** Optional attribution above the bubble (participant name / role). */
  name?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** One message in the investigation thread. Serif for the AI voice, sans for the user. */
export function ChatBubble(props: ChatBubbleProps): JSX.Element;
