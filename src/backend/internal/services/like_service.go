package services

import "github.com/biancacalderon/gymify/backend/internal/repository"

type LikeService struct {
	likeRepository      *repository.LikeRepository
	postRepository      *repository.PostRepository
	notificationService *NotificationService
}

func NewLikeService(
	likeRepository *repository.LikeRepository,
	postRepository *repository.PostRepository,
	notificationService *NotificationService,
) *LikeService {
	return &LikeService{
		likeRepository:      likeRepository,
		postRepository:      postRepository,
		notificationService: notificationService,
	}
}

func (s *LikeService) LikePost(postID, userID string) error {
	if err := ensurePostVisible(s.postRepository, postID, userID); err != nil {
		return err
	}

	if err := s.likeRepository.Add(postID, userID); err != nil {
		return err
	}

	s.notificationService.NotifyLike(postID, userID)

	return nil
}

func (s *LikeService) UnlikePost(postID, userID string) error {
	if err := s.likeRepository.Remove(postID, userID); err != nil {
		return err
	}

	s.notificationService.RemoveLike(postID, userID)

	return nil
}
