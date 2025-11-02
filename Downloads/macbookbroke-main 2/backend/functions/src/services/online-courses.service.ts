import { firestore } from 'firebase-admin';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Online Course Recommendation Service
 * Uses Gemini AI + curated database to find relevant online courses for hobbies
 */

export interface OnlineCourse {
  title: string;
  platform: string;
  url: string;
  instructor?: string;
  rating?: number;
  price: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  thumbnail?: string;
  description?: string;
  source?: 'gemini' | 'curated' | 'firestore'; // Track where the course came from
}

export class OnlineCoursesService {
  constructor() {
    // Using direct Gemini API calls for course recommendations
  }

  /**
   * Get online course recommendations based on hobby preferences
   * Uses Gemini AI for intelligent recommendations + curated database
   */
  async getCourseRecommendations(hobbies: string[], difficulty: string = 'beginner', userLevel?: string): Promise<OnlineCourse[]> {
    try {
      const allCourses: OnlineCourse[] = [];

      // 1. Try Gemini AI recommendations first
      const geminiCourses = await this.getGeminiCourseRecommendations(hobbies, difficulty);
      logger.info(`🤖 Gemini returned ${geminiCourses.length} AI courses`);
      if (geminiCourses.length > 0) {
        allCourses.push(...geminiCourses);
      }

      // 2. Add free resources from popular platforms (fallback/supplement)
      const freeCourses = await this.getFreePlatformCourses(hobbies);
      logger.info(`📚 Curated courses: ${freeCourses.length}`);
      allCourses.push(...freeCourses);

      // 3. Get curated courses from Firestore
      const curatedCourses = await this.getCuratedCourses(hobbies, difficulty);
      allCourses.push(...curatedCourses);

      // Remove duplicates and sort by rating
      const uniqueCourses = this.deduplicateCourses(allCourses);
      uniqueCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      // Log breakdown by source
      const geminiCount = uniqueCourses.filter(c => c.source === 'gemini').length;
      const curatedCount = uniqueCourses.filter(c => c.source === 'curated').length;
      const firestoreCount = uniqueCourses.filter(c => c.source === 'firestore').length;
      
      logger.info('📊 Final course breakdown:', { 
        total: uniqueCourses.length,
        gemini: geminiCount,
        curated: curatedCount,
        firestore: firestoreCount
      });

      return uniqueCourses.slice(0, 20); // Return top 20 courses
    } catch (error) {
      logger.error('Error getting course recommendations:', error);
      return [];
    }
  }

  /**
   * Get course recommendations directly from Gemini API
   * Uses structured prompt to get JSON response
   */
  private async getGeminiCourseRecommendations(hobbies: string[], difficulty: string): Promise<OnlineCourse[]> {
    try {
      const prompt = `Recommend 5 online courses for: ${hobbies.join(', ')}

Return ONLY a valid JSON array. No markdown, no code blocks, no explanation. Just the raw JSON array.

Format (use single quotes in descriptions to avoid JSON errors):
[
  {
    "title": "Course Name",
    "platform": "Coursera",
    "url": "https://example.com/course",
    "instructor": "Instructor Name",
    "rating": 4.5,
    "price": "Free",
    "difficulty": "${difficulty}",
    "duration": "4 weeks",
    "description": "Short description without quotes"
  }
]

Return 5 courses now:`;

      const apiKey = config.gemini.apiKey;
      const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent JSON
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`Gemini API returned ${response.status}:`, errorText.substring(0, 200));
        return [];
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      logger.info('🔍 Raw Gemini response (first 500 chars):', text.substring(0, 500));

      // Extract JSON from response - find the array boundaries
      let jsonText = text.trim();
      
      // Remove wrapping quotes if Gemini wrapped the JSON in quotes
      if (jsonText.startsWith('"') && jsonText.endsWith('"')) {
        logger.info('📦 Detected quoted JSON, unwrapping...');
        jsonText = jsonText.slice(1, -1);
        // Unescape escaped characters properly
        jsonText = jsonText
          .replace(/\\"/g, '"')     // Unescape quotes
          .replace(/\\n/g, ' ')     // Convert escaped newlines to spaces (not actual newlines!)
          .replace(/\\r/g, '')      // Remove escaped carriage returns
          .replace(/\\t/g, ' ')     // Convert tabs to spaces
          .replace(/\\\\/g, '\\');  // Unescape backslashes last
      }
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '');
      
      // Find the actual JSON array
      const startIdx = jsonText.indexOf('[');
      const endIdx = jsonText.lastIndexOf(']');
      
      if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
        logger.warn('❌ Could not find valid JSON array. First 300 chars:', jsonText.substring(0, 300));
        return [];
      }
      
      jsonText = jsonText.substring(startIdx, endIdx + 1);
      
      // Clean up the JSON - normalize whitespace
      jsonText = jsonText
        .replace(/\s+/g, ' ')     // Normalize all whitespace to single spaces
        .trim();

      logger.info('🧹 Cleaned JSON (first 500 chars):', jsonText.substring(0, 500));

      let courses;
      try {
        courses = JSON.parse(jsonText);
      } catch (parseError) {
        logger.error('❌ JSON parse failed:', {
          error: String(parseError),
          jsonSample: jsonText.substring(0, 300)
        });
        return []; // Graceful fallback
      }

      // Validate that we got an array
      if (!Array.isArray(courses)) {
        logger.warn('❌ Gemini response is not an array:', typeof courses);
        return [];
      }

      // Mark all courses as coming from Gemini
      const markedCourses = courses.map((course: OnlineCourse) => ({
        ...course,
        source: 'gemini' as const
      }));

      logger.info('✨ Gemini AI generated course recommendations', { count: markedCourses.length });
      return markedCourses;

    } catch (error) {
      logger.warn('❌ Gemini course recommendations failed, using fallback', { error: String(error) });
      return []; // Graceful fallback to hardcoded courses
    }
  }


  /**
   * Get curated courses from Firestore database
   */
  private async getCuratedCourses(hobbies: string[], difficulty: string): Promise<OnlineCourse[]> {
    try {
      const db = firestore();
      const coursesRef = db.collection('online_courses');
      
      const snapshot = await coursesRef
        .where('category', 'in', hobbies.slice(0, 10)) // Firestore 'in' limit is 10
        .where('difficulty', '==', difficulty)
        .limit(10)
        .get();

      return snapshot.docs.map(doc => doc.data() as OnlineCourse);
    } catch (error) {
      logger.error('Error fetching curated courses:', error);
      return [];
    }
  }


  /**
   * Get free courses from popular platforms (hardcoded curated list)
   */
  private getFreePlatformCourses(hobbies: string[]): Promise<OnlineCourse[]> {
    const freePlatforms: Record<string, OnlineCourse[]> = {
      'Art & Craft': [
        {
          title: 'Drawing Fundamentals - Complete Beginner Course',
          platform: 'Skillshare',
          url: 'https://www.skillshare.com/browse/drawing',
          price: 'Free Trial',
          difficulty: 'beginner',
          rating: 4.7,
          duration: '2-3 hours',
          description: 'Learn basic drawing techniques from scratch'
        },
        {
          title: 'Watercolor Painting for Beginners',
          platform: 'Domestika',
          url: 'https://www.domestika.org/en/courses/area/2-craft',
          price: 'Paid',
          difficulty: 'beginner',
          rating: 4.6,
          duration: '4 weeks',
          description: 'Master watercolor techniques step by step'
        },
        {
          title: 'DIY Crafts and Projects',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=diy+crafts+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.5,
          duration: 'Self-paced',
          description: 'Free video tutorials for various craft projects'
        },
        {
          title: 'Introduction to Sketching',
          platform: 'Udemy',
          url: 'https://www.udemy.com/topic/sketching/',
          price: 'Paid',
          difficulty: 'beginner',
          rating: 4.6,
          duration: '5 hours',
          description: 'Learn sketching fundamentals and techniques'
        },
        {
          title: 'Origami for Beginners',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=origami+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.8,
          duration: 'Self-paced',
          description: 'Learn paper folding art from simple to complex'
        }
      ],
      'Music': [
        {
          title: 'Guitar Lessons for Absolute Beginners',
          platform: 'JustinGuitar',
          url: 'https://www.justinguitar.com/',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.9,
          duration: '3 months',
          instructor: 'Justin Sandercoe',
          description: 'Comprehensive free guitar course from basics to advanced'
        },
        {
          title: 'Music Theory Fundamentals',
          platform: 'Coursera',
          url: 'https://www.coursera.org/learn/edinburgh-music-theory',
          price: 'Free Audit',
          difficulty: 'beginner',
          rating: 4.7,
          duration: '6 weeks',
          instructor: 'University of Edinburgh',
          description: 'Learn the basics of music theory and notation'
        },
        {
          title: 'Piano for Beginners',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=piano+lessons+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.6,
          duration: 'Self-paced',
          description: 'Free piano tutorials from beginner to intermediate'
        },
        {
          title: 'Learn to Sing - Vocal Training',
          platform: 'Udemy',
          url: 'https://www.udemy.com/topic/singing/',
          price: 'Paid',
          difficulty: 'beginner',
          rating: 4.5,
          duration: '4 hours',
          description: 'Improve your singing voice with proper techniques'
        },
        {
          title: 'Music Production Basics',
          platform: 'Skillshare',
          url: 'https://www.skillshare.com/browse/music-production',
          price: 'Free Trial',
          difficulty: 'beginner',
          rating: 4.7,
          duration: '2 weeks',
          description: 'Learn to create music using digital audio workstations'
        },
        {
          title: 'Ukulele for Complete Beginners',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=ukulele+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.8,
          duration: 'Self-paced',
          description: 'Easy-to-follow ukulele lessons for absolute beginners'
        }
      ],
      'Coding': [
        {
          title: 'Python for Everybody',
          platform: 'Coursera',
          url: 'https://www.coursera.org/specializations/python',
          price: 'Free Audit',
          difficulty: 'beginner',
          rating: 4.8,
          duration: '8 months',
          instructor: 'University of Michigan',
          description: 'Learn to program and analyze data with Python'
        },
        {
          title: 'The Odin Project - Full Stack JavaScript',
          platform: 'The Odin Project',
          url: 'https://www.theodinproject.com/',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.9,
          duration: 'Self-paced',
          description: 'Complete full-stack web development curriculum'
        },
        {
          title: 'freeCodeCamp - Responsive Web Design',
          platform: 'freeCodeCamp',
          url: 'https://www.freecodecamp.org/',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.8,
          duration: '300 hours',
          description: 'Learn HTML, CSS, and responsive design principles'
        },
        {
          title: 'CS50 - Introduction to Computer Science',
          platform: 'Harvard University (edX)',
          url: 'https://www.edx.org/course/cs50s-introduction-to-computer-science',
          price: 'Free Audit',
          difficulty: 'beginner',
          rating: 4.9,
          duration: '12 weeks',
          instructor: 'David J. Malan',
          description: 'Harvard\'s legendary intro to computer science'
        },
        {
          title: 'JavaScript Algorithms and Data Structures',
          platform: 'freeCodeCamp',
          url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
          price: 'Free',
          difficulty: 'intermediate',
          rating: 4.7,
          duration: '300 hours',
          description: 'Master JavaScript fundamentals and algorithms'
        }
      ],
      'Technology': [
        {
          title: 'Python for Everybody',
          platform: 'Coursera',
          url: 'https://www.coursera.org/specializations/python',
          price: 'Free Audit',
          difficulty: 'beginner',
          rating: 4.8,
          duration: '8 months',
          description: 'Learn programming with Python from scratch'
        },
        {
          title: 'Google IT Support Professional Certificate',
          platform: 'Coursera',
          url: 'https://www.coursera.org/professional-certificates/google-it-support',
          price: 'Paid',
          difficulty: 'beginner',
          rating: 4.8,
          duration: '6 months',
          instructor: 'Google',
          description: 'Launch your career in IT support'
        },
        {
          title: 'Introduction to Cybersecurity',
          platform: 'Cisco Networking Academy',
          url: 'https://www.netacad.com/courses/cybersecurity/introduction-cybersecurity',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.6,
          duration: '15 hours',
          description: 'Learn cybersecurity basics and best practices'
        }
      ],
      'Photography': [
        {
          title: 'Photography Basics and Beyond',
          platform: 'Coursera',
          url: 'https://www.coursera.org/specializations/photography-basics',
          price: 'Free Audit',
          difficulty: 'beginner',
          rating: 4.7,
          duration: '3 months',
          instructor: 'Michigan State University',
          description: 'Master camera settings, composition, and lighting'
        },
        {
          title: 'Smartphone Photography',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=smartphone+photography+tutorial',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.6,
          duration: 'Self-paced',
          description: 'Take amazing photos with your phone'
        }
      ],
      'Cooking': [
        {
          title: 'Cooking Fundamentals',
          platform: 'Rouxbe',
          url: 'https://rouxbe.com/',
          price: 'Free Trial',
          difficulty: 'beginner',
          rating: 4.7,
          duration: 'Self-paced',
          description: 'Professional cooking techniques at home'
        },
        {
          title: 'Indian Cooking Masterclass',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=indian+cooking+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.8,
          duration: 'Self-paced',
          description: 'Learn authentic Indian recipes and techniques'
        },
        {
          title: 'Baking Basics',
          platform: 'Skillshare',
          url: 'https://www.skillshare.com/browse/baking',
          price: 'Free Trial',
          difficulty: 'beginner',
          rating: 4.6,
          duration: '2-4 hours',
          description: 'Master bread, cakes, and pastries'
        }
      ],
      'Writing': [
        {
          title: 'Creative Writing Specialization',
          platform: 'Coursera',
          url: 'https://www.coursera.org/specializations/creative-writing',
          price: 'Free Audit',
          difficulty: 'beginner',
          rating: 4.7,
          duration: '5 months',
          instructor: 'Wesleyan University',
          description: 'Craft compelling stories and narratives'
        },
        {
          title: 'Blogging and Content Writing',
          platform: 'Udemy',
          url: 'https://www.udemy.com/topic/content-writing/',
          price: 'Paid',
          difficulty: 'beginner',
          rating: 4.5,
          duration: '3-5 hours',
          description: 'Write engaging blog posts and articles'
        }
      ],
      'Reading': [
        {
          title: 'How to Read Faster and Remember More',
          platform: 'Udemy',
          url: 'https://www.udemy.com/topic/speed-reading/',
          price: 'Paid',
          difficulty: 'beginner',
          rating: 4.4,
          duration: '2 hours',
          description: 'Speed reading techniques and comprehension'
        },
        {
          title: 'Book Club Discussion Guides',
          platform: 'Goodreads',
          url: 'https://www.goodreads.com/',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.7,
          duration: 'Ongoing',
          description: 'Join online book clubs and discussions'
        }
      ],
      'Sports': [
        {
          title: 'Fitness and Nutrition Fundamentals',
          platform: 'Coursera',
          url: 'https://www.coursera.org/learn/nutrition-fitness',
          price: 'Free Audit',
          difficulty: 'beginner',
          rating: 4.6,
          duration: '4 weeks',
          description: 'Science-based approach to fitness and health'
        },
        {
          title: 'Home Workout Programs',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=home+workout+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.7,
          duration: 'Self-paced',
          description: 'No-equipment workouts you can do at home'
        },
        {
          title: 'Running for Beginners',
          platform: 'Couch to 5K',
          url: 'https://www.c25k.com/',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.8,
          duration: '9 weeks',
          description: 'Go from couch to running 5K in 9 weeks'
        }
      ],
      'Fitness': [
        {
          title: 'Yoga for Beginners',
          platform: 'Yoga with Adriene',
          url: 'https://www.youtube.com/user/yogawithadriene',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.9,
          duration: 'Self-paced',
          description: 'Gentle yoga flows for all levels'
        },
        {
          title: 'Strength Training Basics',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=strength+training+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.6,
          duration: 'Self-paced',
          description: 'Build muscle and strength safely'
        }
      ],
      'Gaming': [
        {
          title: 'Game Design and Development',
          platform: 'Coursera',
          url: 'https://www.coursera.org/specializations/game-development',
          price: 'Free Audit',
          difficulty: 'beginner',
          rating: 4.6,
          duration: '6 months',
          instructor: 'Michigan State University',
          description: 'Create your own video games'
        },
        {
          title: 'Unity Game Development',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=unity+tutorial+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.7,
          duration: 'Self-paced',
          description: 'Build games with Unity engine'
        },
        {
          title: 'Esports and Competitive Gaming',
          platform: 'Udemy',
          url: 'https://www.udemy.com/topic/esports/',
          price: 'Paid',
          difficulty: 'intermediate',
          rating: 4.3,
          duration: '3 hours',
          description: 'Improve your competitive gaming skills'
        }
      ],
      'Dance': [
        {
          title: 'Hip Hop Dance for Beginners',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=hip+hop+dance+tutorial+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.7,
          duration: 'Self-paced',
          description: 'Learn popular hip hop moves and routines'
        },
        {
          title: 'Bollywood Dance Basics',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=bollywood+dance+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.8,
          duration: 'Self-paced',
          description: 'Master Bollywood dance steps and expressions'
        },
        {
          title: 'Contemporary Dance Fundamentals',
          platform: 'Skillshare',
          url: 'https://www.skillshare.com/browse/dance',
          price: 'Free Trial',
          difficulty: 'beginner',
          rating: 4.5,
          duration: '1-2 hours',
          description: 'Explore contemporary dance techniques'
        }
      ],
      'Gardening': [
        {
          title: 'Gardening Basics for Beginners',
          platform: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=gardening+for+beginners',
          price: 'Free',
          difficulty: 'beginner',
          rating: 4.7,
          duration: 'Self-paced',
          description: 'Start your own garden from scratch'
        },
        {
          title: 'Indoor Plant Care',
          platform: 'Skillshare',
          url: 'https://www.skillshare.com/browse/gardening',
          price: 'Free Trial',
          difficulty: 'beginner',
          rating: 4.6,
          duration: '1 hour',
          description: 'Keep your houseplants thriving'
        },
        {
          title: 'Organic Vegetable Gardening',
          platform: 'Udemy',
          url: 'https://www.udemy.com/topic/organic-gardening/',
          price: 'Paid',
          difficulty: 'beginner',
          rating: 4.5,
          duration: '3 hours',
          description: 'Grow your own organic vegetables'
        }
      ]
    };

    const matchedCourses: OnlineCourse[] = [];
    
    for (const hobby of hobbies) {
      for (const [category, courses] of Object.entries(freePlatforms)) {
        if (category.toLowerCase().includes(hobby.toLowerCase()) || 
            hobby.toLowerCase().includes(category.toLowerCase())) {
          // Mark as curated courses
          const markedCourses = courses.map(course => ({
            ...course,
            source: 'curated' as const
          }));
          matchedCourses.push(...markedCourses);
        }
      }
    }

    logger.info('📚 Curated courses matched', { count: matchedCourses.length });
    return Promise.resolve(matchedCourses);
  }

  /**
   * Remove duplicate courses based on title similarity
   */
  private deduplicateCourses(courses: OnlineCourse[]): OnlineCourse[] {
    const seen = new Set<string>();
    return courses.filter(course => {
      const key = course.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

}

