// ChangePasswordForm.js
import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from './AuthContext';
import './styles/global.css';
import './styles/form.css';
import './styles/modal.css';

const ChangePasswordForm = ({ show, onHide }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const { changePassword, logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'danger', text: 'New passwords do not match.' });
      return;
    }
  
    try {
      // Call the changePassword method from AuthContext
      await changePassword(oldPassword, newPassword);
  
      // Display success message and immediately trigger logout
      setMessage({ type: 'success', text: 'Password changed successfully. Logging out...' });
  
      setTimeout(async () => {
        await logout(); // Immediately log out the user
        onHide(); // Close the modal
      }, 1500);
    } catch (error) {
      const errorMessage = error.message || 'Failed to change password. Please try again.';
      setMessage({ type: 'danger', text: errorMessage });
    }
  };
  

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Change Password</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {message && <Alert variant={message.type}>{message.text}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Old Password</Form.Label>
            <Form.Control
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>New Password</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Re-enter New Password</Form.Label>
            <Form.Control
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>
          <div className="d-flex justify-content-end">
            <Button variant="secondary" onClick={onHide} className="me-2">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ChangePasswordForm;
