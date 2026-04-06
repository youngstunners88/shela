import { useState } from 'react';
import { useAppStore } from '../state/AppStore';

export function SocialFeed() {
  const { snapshot, createPost, likePost, replyToPost } = useAppStore();
  const [postText, setPostText] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  if (!snapshot) return null;

  return (
    <section className="panel">
      <div className="section-title">Community social feed</div>
      <div className="composer">
        <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Share a rank update or taxi wash brag." />
        <button className="primary-btn" onClick={() => { if (postText.trim()) { createPost(postText.trim()); setPostText(''); } }}>Post update</button>
      </div>
      <div className="list">
        {snapshot.posts.map(post => (
          <div className="list-card vertical" key={post.id}>
            <div>
              <strong>{post.authorName}</strong>
              <p>{post.content}</p>
              <small>{post.likes} likes · {post.replies.length} replies</small>
            </div>
            <div className="button-row">
              <button className="secondary-btn" onClick={() => likePost(post.id)}>Like</button>
            </div>
            <textarea
              placeholder="Reply"
              value={replyDrafts[post.id] ?? ''}
              onChange={e => setReplyDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
            />
            <button className="ghost-btn" onClick={() => {
              const text = replyDrafts[post.id]?.trim();
              if (!text) return;
              replyToPost(post.id, text);
              setReplyDrafts(prev => ({ ...prev, [post.id]: '' }));
            }}>Reply</button>
            {post.replies.map(reply => <div className="reply" key={reply.id}><strong>{reply.authorName}</strong><span>{reply.content}</span></div>)}
          </div>
        ))}
      </div>
    </section>
  );
}
