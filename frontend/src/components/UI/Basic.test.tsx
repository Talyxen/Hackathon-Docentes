import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessage, EmptyState } from './Basic';

describe('UI Basic Components', () => {
  test('ErrorMessage renders the message', () => {
    render(<ErrorMessage message="Hubo un error de conexión" />);
    expect(screen.getByText(/Hubo un error de conexión/i)).toBeDefined();
  });

  test('EmptyState renders title and description', () => {
    render(<EmptyState title="Sin datos" description="Agrega datos para ver algo" />);
    expect(screen.getByText(/Sin datos/i)).toBeDefined();
    expect(screen.getByText(/Agrega datos para ver algo/i)).toBeDefined();
  });
});
