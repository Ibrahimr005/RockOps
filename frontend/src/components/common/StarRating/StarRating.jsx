// Create: src/components/common/StarRating/StarRating.jsx
import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import './StarRating.scss';

const StarRating = ({
                        rating = 0,
                        onRatingChange = null,
                        readonly = false,
                        size = 'medium',
                        showLabel = true,
                        className = ''
                    }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const [tempRating, setTempRating] = useState(rating);

    const handleStarClick = (selectedRating) => {
        if (readonly || !onRatingChange) return;

        setTempRating(selectedRating);
        onRatingChange(selectedRating);
    };

    const handleStarHover = (selectedRating) => {
        if (readonly) return;
        setHoverRating(selectedRating);
    };

    const handleMouseLeave = () => {
        if (readonly) return;
        setHoverRating(0);
    };

    const displayRating = hoverRating || tempRating || rating;
    const ratingLabels = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent'
    };

    return (
        <div className={`star-rating ${size} ${readonly ? 'readonly' : 'interactive'} ${className}`}>
            <div className="stars-container">
                {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                        key={star}
                        className={`star ${star <= displayRating ? 'filled' : 'empty'}`}
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => handleStarHover(star)}
                        onMouseLeave={handleMouseLeave}
                    />
                ))}
            </div>
            {showLabel && displayRating > 0 && (
                <span className="rating-label">
                    {ratingLabels[displayRating]} ({displayRating}/5)
                </span>
            )}
        </div>
    );
};

export default StarRating;