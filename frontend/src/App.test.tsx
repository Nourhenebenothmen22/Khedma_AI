import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Simple Frontend Test', () => {
  it('should render a dummy element and pass', () => {
    render(<div>Hello Vitest</div>);
    expect(screen.getByText('Hello Vitest')).toBeDefined();
  });
});
