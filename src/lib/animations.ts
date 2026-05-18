export const animations = {
  fadeIn: "animate-fade-in",
  slideInUp: "animate-slide-in-up",
  slideInDown: "animate-slide-in-down",
  slideInLeft: "animate-slide-in-left",
  slideInRight: "animate-slide-in-right",
  scaleIn: "animate-scale-in",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
}

export const animationClasses = {
  headerFadeIn: "animate-fade-in [animation-duration:600ms]",
  statCardStagger: (index: number) => `animate-slide-in-up [animation-duration:500ms] [animation-delay:${index * 75}ms]`,
  tableRowFadeIn: (index: number) => `animate-fade-in [animation-duration:400ms] [animation-delay:${index * 30}ms]`,
  cardFadeIn: "animate-fade-in [animation-duration:700ms]",
  buttonHoverScale: "hover:scale-105 transition-transform duration-200",
  pillHoverPulse: "hover:shadow-md transition-shadow duration-200",
}
