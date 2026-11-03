import { describe, expect, it } from 'vitest';
import { EventBus } from './EventBus';
import { StateMachine, StateMachineEventMap } from './StateMachine';

type TestState = 'Boot' | 'Menu' | 'Loading' | 'Race' | 'Results';

const TEST_TRANSITIONS: Record<TestState, readonly TestState[]> = {
  Boot: ['Menu'],
  Menu: ['Loading'],
  Loading: ['Race'],
  Race: ['Results', 'Menu', 'Loading'],
  Results: ['Menu', 'Loading'],
};

describe('StateMachine', () => {
  it('manages valid transitions', () => {
    const sm = new StateMachine<TestState>({
      initial: 'Boot',
      transitions: TEST_TRANSITIONS,
    });

    expect(sm.getState()).toBe('Boot');
    expect(sm.canTransition('Menu')).toBe(true);
    expect(sm.canTransition('Race')).toBe(false);

    sm.transition('Menu');
    expect(sm.getState()).toBe('Menu');

    sm.transition('Loading');
    expect(sm.getState()).toBe('Loading');

    sm.transition('Race');
    expect(sm.getState()).toBe('Race');

    sm.transition('Results');
    expect(sm.getState()).toBe('Results');

    sm.transition('Loading');
    expect(sm.getState()).toBe('Loading');
  });

  it('throws descriptive error on invalid transition', () => {
    const sm = new StateMachine<TestState>({
      initial: 'Boot',
      transitions: TEST_TRANSITIONS,
    });

    expect(() => sm.transition('Race')).toThrowError(
      'Invalid state transition: Cannot transition from "Boot" to "Race". Allowed transitions from "Boot": [Menu].',
    );
    expect(sm.getState()).toBe('Boot');
  });

  it('emits exit before enter in correct sequence', () => {
    const bus = new EventBus<StateMachineEventMap<TestState>>();
    const events: string[] = [];

    bus.on('state:exit', (payload) => {
      events.push(`exit:${payload.state}->${payload.to}`);
    });

    bus.on('state:enter', (payload) => {
      events.push(`enter:${payload.state}<-${payload.from ?? 'none'}`);
    });

    const sm = new StateMachine<TestState>({
      initial: 'Boot',
      transitions: TEST_TRANSITIONS,
      bus,
    });

    sm.start();
    expect(events).toEqual(['enter:Boot<-none']);

    events.length = 0;
    sm.transition('Menu');
    expect(events).toEqual(['exit:Boot->Menu', 'enter:Menu<-Boot']);
  });

  it('guarantees listeners fire exactly once per event', () => {
    const bus = new EventBus<StateMachineEventMap<TestState>>();
    let enterCount = 0;
    let exitCount = 0;

    bus.on('state:enter', () => {
      enterCount++;
    });

    bus.on('state:exit', () => {
      exitCount++;
    });

    const sm = new StateMachine<TestState>({
      initial: 'Boot',
      transitions: TEST_TRANSITIONS,
      bus,
    });

    sm.transition('Menu');
    expect(enterCount).toBe(1);
    expect(exitCount).toBe(1);
  });
});
