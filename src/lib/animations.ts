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
  headerFadeIn: "animate-fade-in [animation-duration:480ms]",
  statCardStagger: (index: number) => `animate-slide-in-up [animation-duration:480ms] [animation-delay:${index * 70}ms]`,
  tableRowFadeIn: (index: number) => `animate-fade-in [animation-duration:420ms] [animation-delay:${index * 35}ms]`,
  cardFadeIn: "animate-fade-in [animation-duration:480ms]",
  buttonHoverScale: "hover:scale-[1.02] transition-transform duration-250",
  pillHoverPulse: "hover:shadow-md transition-shadow duration-250",
}
