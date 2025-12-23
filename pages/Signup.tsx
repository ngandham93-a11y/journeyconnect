import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/login');
  }, [navigate]);
  
  return null;
};