import React from 'react';
import { Contador, ContadorProps } from './Contador';

export type CountdownTimerProps = ContadorProps;

export const CountdownTimer: React.FC<CountdownTimerProps> = (props) => {
  return <Contador {...props} id={props.id || (props.compact ? 'compact-countdown-timer' : 'main-countdown-timer')} />;
};

export { Contador };

