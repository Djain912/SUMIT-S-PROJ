import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function checkNotes() {
  try {
    // Get notes from the chapter
    const notes = await prisma.note.findMany({
      where: {
        subtopic: {
          chapter: {
            id: 'cmp8sooq20000b3q0ovaktu8v'
          }
        }
      },
      select: {
        id: true,
        title: true,
        contentHtml: true,
      },
      orderBy: {
        orderIndex: 'asc'
      }
    });

    console.log(`Found ${notes.length} notes\n`);
    
    notes.forEach((note, index) => {
      console.log(`\n=== Note ${index + 1}: ${note.title} ===`);
      console.log(`ID: ${note.id}`);
      console.log(`Content length: ${note.contentHtml?.length || 0} characters`);
      
      // Check for issues
      if (note.contentHtml) {
        const hasTable = note.contentHtml.includes('<table');
        const hasLongWords = /\w{50,}/.test(note.contentHtml);
        const hasFixedWidths = /width:\s*\d+px/.test(note.contentHtml);
        
        console.log(`Has table: ${hasTable}`);
        console.log(`Has long words: ${hasLongWords}`);
        console.log(`Has fixed widths: ${hasFixedWidths}`);
        
        // Save to file
        const filename = `note-${index + 1}-${note.id}.html`;
        fs.writeFileSync(filename, note.contentHtml, 'utf-8');
        console.log(`Saved to: ${filename}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotes();
