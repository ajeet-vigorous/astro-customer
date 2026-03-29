import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogApi } from '../api/services';
import './BlogList.css';

const BlogDetail = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await blogApi.getById({ blogId: id });
        const d = res.data?.data || res.data;
        setBlog(Array.isArray(d) ? d[0] : d);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;
  if (!blog) return <div className="no-data">Blog not found</div>;

  return (
    <div className="blog-detail-page">
      <div className="container">
        <div className="blog-detail-nav">
          <Link to="/blog">&larr; Back to Blogs</Link>
        </div>
        {blog.image && <img src={blog.image.startsWith('http') ? blog.image : `https://astrology-i7c9.onrender.com${blog.image}`} alt={blog.title} className="blog-detail-img" />}
        <h1 className="blog-detail-title">{blog.title}</h1>
        {blog.createdAt && <p className="blog-detail-date">{new Date(blog.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
        <div className="blog-detail-content" dangerouslySetInnerHTML={{ __html: blog.description || blog.content || '' }} />
      </div>
    </div>
  );
};

export default BlogDetail;
