import React from 'react';

type Props = { fallback: (error: Error) => React.ReactNode; children: React.ReactNode };
type State = { error: Error | null };

/** Catches a crash inside its children and shows the message instead of closing the screen. */
export default class ErrorCatcher extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('Caught error:', error);
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
