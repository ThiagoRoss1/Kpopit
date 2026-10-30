import { useParams } from "react-router";
import BlogPost from "../../src/pages/Blog/BlogPost";

export const handle = { puff: true };

export default function BlogPostRoute() {
  const { slug = "" } = useParams();
  return <BlogPost key={slug} slug={slug} />;
}
