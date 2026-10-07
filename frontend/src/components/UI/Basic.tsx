import React from 'react';
import { Link } from 'react-router-dom';

export const Loader: React.FC = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 2rem' }}>
      <div className="loader"></div>
    </div>
  );
};

export const ErrorMessage: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="error-message">
      <strong>⚠️ Error: </strong> {message}
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; description?: string; actionLink?: string; actionText?: string }> = ({
  title,
  description,
  actionLink = "/upload",
  actionText = "Subir CSV/XLSX"
}) => {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p style={{ marginBottom: '1.5rem' }}>{description}</p>}
      {actionLink && (
        <Link to={actionLink} className="btn">
          {actionText}
        </Link>
      )}
    </div>
  );
};
