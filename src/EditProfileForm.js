import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import InputMask from 'react-input-mask';
import { useAuth } from './AuthContext';

const EditProfileForm = ({ show, onHide, user }) => {
  const [formData, setFormData] = useState({
    userName: user?.userName || '',
    email: user?.email || '',
    mobileNumber: user?.mobileNumber || '+92 ',
    password: '',
  });
  const [message, setMessage] = useState(null);

  const handleChange = e => {
    const { name, value } = e.target;

    // Prevent editing/removing the "+92 " prefix
    if (name === 'mobileNumber' && !value.startsWith('+92 ')) return;

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage(null);

    try {
      const updateData = { ...formData };
      if (!updateData.password) delete updateData.password;

      await axios.put(
        `${process.env.REACT_APP_API_URL}/users/${user.userId}`,
        updateData,
        { withCredentials: true }
      );
      setMessage({ type: 'success', text: 'Profile updated!' });
      setTimeout(() => onHide(), 1200);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: 'Update failed: ' + (error.response?.data?.message || error.message)
      });
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {message && <Alert variant={message.type}>{message.text}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>User Name</Form.Label>
            <Form.Control
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              required disabled={Boolean(user?.email)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@email.com"
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
              required disabled={Boolean(user?.email)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mobile Number</Form.Label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#e9ecef',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem 0 0 0.25rem',
                fontSize: '1rem',
                whiteSpace: 'nowrap'
              }}>
                +92
              </span>
              <InputMask
                mask="399 9999999"
                maskChar=" "
                value={formData.mobileNumber.replace('+92 ', '')}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    mobileNumber: '+92 ' + e.target.value
                  }))
                }
              >
                {(inputProps) => (
                  <Form.Control
                    {...inputProps}
                    type="text"
                    name="mobileNumber"
                    placeholder="3## #######"
                    style={{
                      borderTopLeftRadius: '0',
                      borderBottomLeftRadius: '0'
                    }}
                  />
                )}
              </InputMask>
            </div>
            <Form.Text className="text-muted">
              Format: +92 3## #######
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>New Password (leave blank to keep current)</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100">
            Save Changes
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditProfileForm;