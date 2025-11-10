import React from 'react';

const PersonalInfoTab = ({ employee, formatDate }) => {
    return (
        <div className="personal-info tab-panel">
            {/*<h3>Personal Information</h3>*/}

            <div className="info-grid">
                <div className="info-group">
                    <div className="info-item">
                        <label>Full Name</label>
                        <p>{`${employee.firstName} ${employee.middleName ? employee.middleName + ' ' : ''}${employee.lastName}`}</p>
                    </div>
                    <div className="info-item">
                        <label>Gender</label>
                        <p>{employee.gender || 'Not specified'}</p>
                    </div>
                    <div className="info-item">
                        <label>Date of Birth</label>
                        <p>{formatDate(employee.birthDate)}</p>
                    </div>
                    <div className="info-item">
                        <label>National ID</label>
                        <p>{employee.nationalIDNumber || 'Not available'}</p>
                    </div>
                </div>

                <div className="info-group">
                    <div className="info-item">
                        <label>Email</label>
                        <p>{employee.email || 'Not provided'}</p>
                    </div>
                    <div className="info-item">
                        <label>Phone Number</label>
                        <p>{employee.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div className="info-item">
                        <label>Marital Status</label>
                        <p>{employee.maritalStatus || 'Not specified'}</p>
                    </div>
                    <div className="info-item">
                        <label>Military Status</label>
                        <p>{employee.militaryStatus || 'Not applicable'}</p>
                    </div>
                </div>

                <div className="info-group">
                    <div className="info-item">
                        <label>Address</label>
                        <p>{employee.address || 'Not provided'}</p>
                    </div>
                    <div className="info-item">
                        <label>City</label>
                        <p>{employee.city || 'Not provided'}</p>
                    </div>
                    <div className="info-item">
                        <label>Country</label>
                        <p>{employee.country || 'Not provided'}</p>
                    </div>
                    <div className="info-item">
                        <label>Education</label>
                        <p>{employee.education || 'Not specified'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalInfoTab;