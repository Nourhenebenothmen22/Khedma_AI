import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Connecting to Supabase database...');
  
  try {
    // 1. Create a test job description draft
    console.log('✍️ Inserting test Job Description...');
    const newJob = await prisma.jobDescription.create({
      data: {
        title: 'Senior Data Engineer (Test)',
        seniority: 'Senior',
        location: 'Remote',
        workType: 'Remote',
        employmentType: 'FullTime',
        language: 'en',
        tone: 'professional',
        sections: {
          title: 'Senior Data Engineer (Test)',
          summary: 'We are looking for a test data engineer to verify database integration.',
          responsibilities: ['Build pipelines', 'Maintain tests'],
          requiredSkills: ['SQL', 'Python'],
          preferredSkills: ['AWS', 'Prisma'],
          techStack: ['PostgreSQL', 'Docker'],
          softSkills: ['Problem solving'],
          salaryRange: '$120,000 - $140,000',
          interviewQuestions: ['How do you optimize a query?'],
          atsKeywords: ['Data Pipeline', 'Prisma', 'Supabase']
        },
        atsKeywords: ['Data Pipeline', 'Prisma', 'Supabase'],
        isFavorite: false,
        isDraft: true,
        versions: {
          create: {
            versionNumber: 1,
            sections: {
              title: 'Senior Data Engineer (Test)',
              summary: 'We are looking for a test data engineer to verify database integration.'
            }
          }
        }
      }
    });

    console.log(`✅ Success! Test Job Description created with ID: ${newJob.id}`);
    
    // 2. Fetch it back
    console.log('🔍 Reading job description from Supabase...');
    const fetchedJob = await prisma.jobDescription.findUnique({
      where: { id: newJob.id },
      include: { versions: true }
    });

    console.log('📄 Fetched Job details:');
    console.log(`- Title: ${fetchedJob?.title}`);
    console.log(`- Version count: ${fetchedJob?.versions.length}`);
    console.log(`- ATS Keywords: ${fetchedJob?.atsKeywords.join(', ')}`);

    // 3. Clean up the test row
    console.log('🗑️ Cleaning up test data...');
    await prisma.jobDescription.delete({
      where: { id: newJob.id }
    });
    console.log('✨ Cleanup complete. Database connection is 100% operational!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
