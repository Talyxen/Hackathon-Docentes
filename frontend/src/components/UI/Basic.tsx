import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div className="loader"></div>
    </div>
  );
};

export const ErrorMessage: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="error-message">
      <strong>Error: </strong> {message}
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; description?: string }> = ({ title, description }) => {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
};
