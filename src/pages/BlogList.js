import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogApi } from '../api/services';
import './BlogList.css';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await blogApi.getAll();
        const d = res.data?.data || res.data;
        setBlogs(Array.isArray(d) ? d : d?.recordList || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="blog-list-page">
      <div className="list-hero">
        <h2>Astrology Blog</h2>
        <p>Read latest articles on astrology, spirituality and more</p>
      </div>
      <div className="container">
        {blogs.length === 0 ? (
          <div className="no-data">No blogs found</div>
        ) : (
          <div className="blog-list-grid">
            {blogs.map((blog) => (
              <Link key={blog.id} to={`/blog/${blog.id}`} className="blog-list-card">
                {blog.image && <img src={blog.image.startsWith('http') ? blog.image : `https://astrology-i7c9.onrender.com${blog.image}`} alt={blog.title} />}
                <div className="blog-list-info">
                  <h4>{blog.title}</h4>
                  <p>{(blog.description || '').replace(/<[^>]+>/g, '').slice(0, 150)}...</p>
                  <div className="blog-list-meta">
                    {blog.createdAt && <span>{new Date(blog.createdAt).toLocaleDateString()}</span>}
                    <span className="read-more-link">Read More &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogList;
