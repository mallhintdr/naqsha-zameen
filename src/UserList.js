// src/UserList.js
import React, { useEffect, useState } from 'react';
import {
  Table, Alert, Button, ButtonGroup, Spinner, Modal, Form
} from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import './styles/global.css';
import './styles/table.css';
import './styles/modal.css';

import UserEditForm from './UserEditForm';
import {
  calculateEndDate,
  calculateDaysRemaining,
  calculateStatus
} from './userUtils';
import {
  FaAngleDoubleLeft, FaAngleLeft, FaAngleRight, FaAngleDoubleRight
} from 'react-icons/fa';

const UserList = () => {
  /* ---------------- state ---------------- */
  const [users,          setUsers]          = useState([]);
  const [filteredUsers,  setFilteredUsers]  = useState([]);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [usersPerPage]                     = useState(10);
  const [editUserId,     setEditUserId]     = useState(null);
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [showDeleteModal,setShowDeleteModal]= useState(false);
  const [userToDelete,   setUserToDelete]   = useState(null);
  const [error,          setError]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [filters,        setFilters]        = useState({});
  const [sortConfig,     setSortConfig]     = useState({});

  const { logout, loginAs } = useAuth();        /* eslint-disable-line no-unused-vars */
  const navigate  = useNavigate();

  /* -------------- load users -------------- */
  useEffect(() => { fetchUsers(); }, []);

  /* -------------- re‑apply filters/sort -------------- */
  useEffect(() => { applyFiltersAndSort(); },
            [filters, sortConfig, users]);

  /* =====================================================
     Fetch users + derive computed fields + normalize
  ===================================================== */
  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/users`);
      const enriched = data.map(u => {
        // always have mauzaList as ARRAY
        const mauzaArr = Array.isArray(u.mauzaList)
          ? u.mauzaList
          : (u.mauzaList || '')
              .split(',')
              .map(m => m.trim())
              .filter(Boolean);

        return {
          ...u,
          mauzaList:      mauzaArr,
          daysRemaining:  calculateDaysRemaining(u.startDate, u.subscriptionType),
          endDate:        calculateEndDate(u.startDate, u.subscriptionType),
          status:         calculateStatus(calculateEndDate(u.startDate, u.subscriptionType))
        };
      });

      setUsers(enriched);
      setFilteredUsers(enriched);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load user data.');
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     Filter + sort
  ===================================================== */
  const applyFiltersAndSort = () => {
    let list = [...users];

    // ---------- filters ----------
    Object.entries(filters).forEach(([key, val]) => {
      if (val) {
        list = list.filter(u => {
          const field =
            Array.isArray(u[key]) ? u[key].join(', ') : String(u[key] ?? '');
          return field.toLowerCase().includes(val.toLowerCase());
        });
      }
    });

    // ---------- sort ----------
    if (sortConfig.key) {
      list.sort((a, b) => {
        const aField = Array.isArray(a[sortConfig.key])
          ? a[sortConfig.key].join(', ')
          : a[sortConfig.key];

        const bField = Array.isArray(b[sortConfig.key])
          ? b[sortConfig.key].join(', ')
          : b[sortConfig.key];

        if (typeof aField === 'string' && typeof bField === 'string')
          return sortConfig.direction === 'asc'
            ? aField.localeCompare(bField)
            : bField.localeCompare(aField);

        if (typeof aField === 'number' && typeof bField === 'number')
          return sortConfig.direction === 'asc' ? aField - bField : bField - aField;

        return 0;
      });
    }

    setFilteredUsers(list);
  };

  /* =====================================================
     Pagination helpers
  ===================================================== */
  const totalPages      = Math.ceil(filteredUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirst    = indexOfLastUser - usersPerPage;
  const currentUsers    = filteredUsers.slice(indexOfFirst, indexOfLastUser);

  /* =====================================================
     Handlers
  ===================================================== */
  const handleFilterChange = (e, key) =>
    setFilters(p => ({ ...p, [key]: e.target.value }));

  const handleSort = (key) =>
    setSortConfig(p => ({
      key,
      direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc'
    }));

  const handleLoginAs = async (uid) => {
    try {
      await loginAs(uid);
    } catch (err) {
      console.error('Login as user failed:', err);
      setError('Failed to login as user.');
    }
  };
  /* =====================================================
     Rendering
  ===================================================== */
  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error)   return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="container mt-1">
      <h2 className="text-center mb-3">User List</h2>

      <div className="responsive-table-container"
           style={{ overflowY:'auto', maxHeight:'75vh' }}>
        <Table striped bordered hover responsive className="table-tech">
          <thead className="table-header">
            {/* ---------- Row 1: column names ---------- */}
            <tr>
              {[
                { key:'userName',        label:'User Name' },
                { key:'userId',          label:'User\nID' },
                { key:'mobileNumber',    label:'Mobile\nNumber' },
                { key:'tehsil',          label:'Tehsil' },
                { key:'mauzaList',       label:'Mauza\nList' },
                { key:'subscriptionType',label:'Subscription\nType' },
                { key:'startDate',       label:'Start\nDate' },
                { key:'endDate',         label:'End\nDate' },
                { key:'daysRemaining',   label:'Days\nRemaining' },
                { key:'status',          label:'Status' },
                { key:'userType',        label:'User\nType' }
              ].map(({ key, label }) => (
                <th key={key}
                    style={{ cursor:'pointer',
                             textAlign:'center',
                             whiteSpace:'pre-wrap' }}
                    onClick={() => handleSort(key)}>
                  {label}
                  {sortConfig.key === key && (
                    <span style={{ marginLeft:4, fontSize:'0.8rem' }}>
                      {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
              ))}
              <th>Actions</th>
              <th>Details</th>
            </tr>

            {/* ---------- Row 2: filters ---------- */}
            <tr>
              {[
                'userName','userId','mobileNumber','tehsil','mauzaList',
                'subscriptionType','startDate','endDate',
                'daysRemaining','status','userType'
              ].map(k => (
                <th key={`f-${k}`} style={{ padding:5 }}>
                  <Form.Control
                    size="sm"
                    placeholder="Search"
                    value={filters[k] || ''}
                    onChange={e => handleFilterChange(e, k)}
                  />
                </th>
              ))}
              <th></th><th></th>
            </tr>
          </thead>

          <tbody>
            {currentUsers.map(u => (
              <tr key={u.userId}>
                <td>{u.userName}</td>
                <td>{u.userId}</td>
                <td>{u.mobileNumber}</td>
                <td>{u.tehsil}</td>
                <td>
                  <Form.Select size="sm" defaultValue="">
                    {u.mauzaList.map((m,i) => (
                      <option key={i}>{m}</option>
                    ))}
                  </Form.Select>
                </td>
                <td>{u.subscriptionType}</td>
                <td>{new Date(u.startDate).toLocaleDateString()}</td>
                <td>{new Date(u.endDate).toLocaleDateString()}</td>
                <td>{u.daysRemaining}</td>
                <td>{u.status}</td>
                <td>{u.userType}</td>
                <td>
                  <ButtonGroup size="sm">
                    <Button variant="warning"
                            title="Edit User"
                            onClick={() => { setEditUserId(u.userId); setShowEditModal(true); }}>
                      <i className="fas fa-edit"></i>
                    </Button>
                    <Button variant="danger"
                            onClick={() => { setUserToDelete(u.userId); setShowDeleteModal(true); }}>
                      Delete
                    </Button>
                    <Button variant="secondary"
                            title="Login as User"
                            onClick={() => handleLoginAs(u.userId)}>
                      Login
                    </Button>
                  </ButtonGroup>
                </td>
                <td>
                  <Button size="sm" variant="info"
                          onClick={() => navigate(`/users/${u.userId}/details`)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* ---------- pagination ---------- */}
      <div className="pagination-controls d-flex justify-content-between align-items-center mt-3">
        <div>Showing {filteredUsers.length} of {users.length} records</div>
        <div className="d-flex align-items-center">
          <Button variant="outline-primary"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}>
            <FaAngleDoubleLeft/>
          </Button>
          <Button variant="outline-primary"
                  onClick={() => setCurrentPage(p => Math.max(1,p-1))}
                  disabled={currentPage === 1}>
            <FaAngleLeft/>
          </Button>
          <span className="mx-2">Page {currentPage} of {totalPages}</span>
          <Button variant="outline-primary"
                  onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))}
                  disabled={currentPage === totalPages}>
            <FaAngleRight/>
          </Button>
          <Button variant="outline-primary"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}>
            <FaAngleDoubleRight/>
          </Button>
        </div>
      </div>

      {/* ---------- modals ---------- */}
      {showEditModal && (
        <UserEditForm
          userId={editUserId}
          handleClose={() => { setShowEditModal(false); setEditUserId(null); }}
          refreshUsers={fetchUsers}
        />
      )}

      <Modal show={showDeleteModal}
             onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Delete</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete this user?</Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={async () => {
            try {
              await axios.delete(`${process.env.REACT_APP_API_URL}/users/${userToDelete}`);
              setShowDeleteModal(false);
              setUserToDelete(null);
              fetchUsers();
            } catch (err) {
              console.error('Delete failed:', err);
              setError('Failed to delete user.');
            }
          }}>Delete</Button>
          <Button variant="secondary"
                  onClick={() => setShowDeleteModal(false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserList;
