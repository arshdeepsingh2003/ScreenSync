import ImageSlide from '../components/tv/slides/ImageSlide';
import VideoSlide from '../components/tv/slides/VideoSlide';
import TextSlide from '../components/tv/slides/TextSlide';
import PDFSlide from '../components/tv/slides/PDFSlide';
import HTMLSlide from '../components/tv/slides/HTMLSlide';

export const CONTENT_TYPE_REGISTRY = {
  image: ImageSlide,
  video: VideoSlide,
  text: TextSlide,
  pdf: PDFSlide,
  html: HTMLSlide,
};
