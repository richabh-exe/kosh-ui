/**
 * The Motion feature bundle, in its own file so it becomes its own chunk.
 * <KoshProvider> imports this file dynamically, and only when the motion
 * level is not "none".
 *
 * domAnimation covers animate, exit, hover, tap and in-view. Switch to domMax
 * only when a component needs `layout` animations or drag.
 */
import { domAnimation } from "motion/react";

export default domAnimation;
