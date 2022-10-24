import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const app = express();
app.use(cors());
app.options("*", cors());
app.use(express.json());

const prisma = new PrismaClient();

const port = 1234;

const SECRET = "ABC";

function getToken(id: number) {
  return jwt.sign({ id: id }, SECRET, {
    expiresIn: "365 days",
  });
}

async function getCurrentUser(token: string) {
  //@ts-ignore
  const { id } = jwt.verify(token, SECRET);
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: id },
  });
  return user;
}

app.get("/instructors", async (req, res) => {
  const instructor = await prisma.instructor.findMany({
    include: { courses: true },
  });
  res.send(instructor);
});

app.get("/instructors/:id",async (req, res) => {
  const instructor = await prisma.instructor.findUnique({
    where: { id: Number(req.params.id) },
    include: { courses: {include: {videos: true}} },
  });

  if (instructor) {
    res.send(instructor);
  } else {
    res.status(404).send({ error: "Instructor not found" });
  }
})

app.get("/courses",async (req, res) => {
  console.log(req.query.category)
  const course = await prisma.course.findMany({
    //@ts-ignore
    where: {
      ...(req.query.category != 'null' ? {category: req.query.category} : {})
    },
    include:{videos:true, Instructor:true}}) 
    res.send(course)
})

app.get("/courses/:id",async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: Number(req.params.id) },
    include: { videos: true, Instructor: true, reviews: {include: {User: true}} },
  });

  if (course) {
    res.send(course);
  } else {
    res.status(404).send({ error: "Course not found" });
  }
})
app.get(`/courses/category/:category`, async (req, res) => {
  try{
    const courses = await prisma.course.findMany({
      include:{Instructor:true},
      where: {
        category:req.params.category
      },
    })
    res.send(courses)
  } catch(error) {
    //@ts-ignore
    res.status(400).send({error:error.message})
  }
})

// app.post("/courses/:id/buy", async (req, res) => {
//   console.log(req.body)
//   const review = await prisma.review.create({
//     data:req.body,
//     include: {User:true}
//   })
//   res.send(review)
// })

app.post("/reviews", async (req, res) => {
  const review = await prisma.review.create({
    data: {
      comment: req.body.comment,
      userId: Number(req.body.userId),
      courseId: Number(req.body.courseId),
      created_at: new Date(),
    },
    include: {User:true },
    
  })
  res.send(review)
})

app.delete('/reviews/:id', async (req, res) => {
  const id = Number(req.params.id)
  const review = await prisma.review.delete({
    where: {id}
  })
  res.send(review)
})

app.patch('/review/:id', async (req, res) => {
  const id = Number(req.params.id)

})

app.post("/sign-up/user", async (req, res) => {
  try {
    const match = await prisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (match) {
      res.status(400).send({ error: "This account already exists." });
    } else {
      const newUser = await prisma.user.create({
        //@ts-ignore
        data: {
          name: req.body.name,
          // lastName: req.body.lastName,
          email: req.body.email,
          password: bcrypt.hashSync(req.body.password),
        },
      });

      res.send({ user: newUser, token: getToken(newUser.id) });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ error: error.message });
  }
});

app.post("/sign-in", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email },
  });
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.send({ user: user, token: getToken(user.id) });
  } else {
    res.status(400).send({ error: "Invalid email/password combination." });
  }
});

app.get("/validate/user", async (req, res) => {
  try {
    if (req.headers.authorization) {
      const user = await getCurrentUser(req.headers.authorization);
      // @ts-ignore
      res.send({ user, token: getToken(user.id) });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ error: error.message });
  }
});



app.listen(port, () => {
  console.log(`Running: http://localhost:${port}`);
});
